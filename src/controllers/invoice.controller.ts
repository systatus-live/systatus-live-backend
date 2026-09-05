import { BadRequestException, Controller, Get, InternalServerErrorException, Param, Query, Request, Res, UseGuards } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthGuard } from "../middlewares/auth.guard";
import { PdfService } from "src/services/pdf.service";
import { StripeService } from "src/services/stripe.service";
import { Response } from "express";
import { InvoiceStatusEnum, InvoiceStatusLabelEnum } from "src/types/InvoiceStatusEnum";
import formatDate from "src/utils/formatDate";
import { PaymentStatusEnum } from "src/types/PaymentStatusEnum";
import axios from "axios";
import { CreditCardBrandLabelEnum } from "src/types/CreditCardBrandEnum";

@Controller({
  version: "1",
  path: "/invoices"
})
@UseGuards(AuthGuard)
export class InvoiceController {
  private querySize: number = 6;

  constructor(
    private dataSource: DataSource,
    private pdfService: PdfService,
    private stripeService: StripeService,
  ) { }

  @Get("/")
  async getInvoiceList(@Request() request: Request, @Query("page") page: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    const [list, [{ total }]] = await Promise.all([
      this.dataSource.query(`
        select
          inv.id
          , inv.iid
          , inv.issue_date
          , inv.due_date
          , inv.amount
          , inv.status
          , pla.name as "plan"
          , pla.image
        from invoices inv
        join subscriptions sub on sub.id = inv.subscription_id
        join plans pla on pla.id = sub.plan_id
        where sub.user_id = '${request["loggedUser"]}'
        order by inv.created_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `),
      this.dataSource.query(`
        select count(*) as total
        from invoices inv
        join subscriptions sub on sub.id = inv.subscription_id
        where sub.user_id = '${request["loggedUser"]}'
      `),
    ]);

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(total ?? 0)
      }
    }
  }

  @Get("/:id/pdf")
  async pdfInvoicePDF(@Request() request: Request, @Res() response: Response, @Param("id") id: string) {
    const [rootData] = await this.dataSource.query(`
      select
        inv.id
        , inv.iid
        , inv.issue_date
        , inv.due_date
        , inv.amount
        , inv.status
        , inv.gateway_id as "invoiceGatewayId"
        , inv.subscription_start_date
        , inv.subscription_end_date
        , usu.name as user
        , usu.email
        , usu.stripe_customer_id as "stripeCustomerId"
        , pla.name as plan
        , pay.id as "paymentId"
        , pay.created_at as "paymentDate"
      from invoices inv
      join subscriptions sub on sub.id = inv.subscription_id
      join plans pla on pla.id = sub.plan_id
      join users usu on usu.id = sub.user_id
      left join payments pay on pay.invoice_id = inv.id and pay.status = '${PaymentStatusEnum.PAID}'
      where sub.user_id = $1
      and inv.id = $2
    `, [request["loggedUser"], id]);

    if (!rootData) {
      throw new BadRequestException("Fatura não encontrada");
    }

    const [companyAddr, customerAddr, cardInfo] = await Promise.all([
      this.stripeService.getAccountAddress(),
      rootData.stripeCustomerId ? this.stripeService.getCustomerAddress(rootData.stripeCustomerId) : Promise.resolve(null),
      rootData.invoiceGatewayId && rootData.amount > 0 ? this.stripeService.getCardByInvoiceGatewayId(rootData.invoiceGatewayId) : Promise.resolve(null),
    ]).catch(error => {
      throw new InternalServerErrorException("Falha ao retornar a fatura.");
    });

    const formatAddress = (addr: { line1: string; line2: string; city: string; state: string; postalCode: string; country: string } | null) => {
      if (!addr) return [];
      const lines: string[] = [];
      if (addr.line1) lines.push(addr.line1);
      if (addr.line2) lines.push(addr.line2);
      const cityLine = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
      if (cityLine) lines.push(cityLine);
      if (addr.country) lines.push(addr.country);
      return lines;
    };

    const formatCardBrand = (brand: string): string => CreditCardBrandLabelEnum[brand as keyof typeof CreditCardBrandLabelEnum] ?? brand.charAt(0).toUpperCase() + brand.slice(1);

    const invoice = {
      invoiceNumber: rootData.iid,
      issueDate: formatDate(rootData.issue_date, "D [de] MMMM [de] YYYY"),
      dueDate: formatDate(rootData.due_date, "D [de] MMMM [de] YYYY"),
      amount: rootData.amount,
      status: rootData.status,
      description: `Assinatura do plano "${rootData.plan}"`,
      customerName: rootData.user,
      customerEmail: rootData.email,
      customerPhone: customerAddr?.phone ?? "",
      customerAddressLines: formatAddress(customerAddr),
      companyPhone: companyAddr?.phone ?? "",
      companyEmail: companyAddr?.email ?? "",
      companyAddressLines: formatAddress(companyAddr),
      paymentMethod: cardInfo ? `${formatCardBrand(cardInfo.brand)} •••• ${cardInfo.last4}` : "Cortesia",
      paymentDate: rootData.paymentDate == null ? "-" : formatDate(rootData.paymentDate, "DD/MM/YYYY HH:mm:ss"),
      transactionId: rootData.paymentId || "-",
      period: `${formatDate(rootData.subscription_start_date, "DD/MM/YYYY")} a ${formatDate(rootData.subscription_end_date, "DD/MM/YYYY")}`
    };

    const statusColor = {
      [InvoiceStatusEnum.PAID]: "#05DF72",
      [InvoiceStatusEnum.PENDING]: "#FDC700",
      [InvoiceStatusEnum.CANCELED]: "#9b9b9bff",
      [InvoiceStatusEnum.DUE_DATE]: "#FF6467"
    };

    const imageUrlToBase64 = async (imageUrl: string) => {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const contentType = response.headers["content-type"];
      const base64Image = `data:${contentType};base64,${Buffer.from(response.data).toString("base64")}`;
      return base64Image;
    };
    const systatusLogo = await imageUrlToBase64(`${process.env.WEB_URL}/logos/systatus-live.png`);

    try {
      const dd = {
        pageSize: "A4",
        pageMargins: [40, 40, 40, 40],

        content: [
          {
            columns: [
              {
                stack: [
                  {
                    columns: [
                      {
                        image: systatusLogo,
                        width: 20,
                        margin: [0, 2, 0, 0],
                      },
                      {
                        margin: [5, 0, 0, 0],
                        text: "Systatus.Live",
                        style: "companyTitle",
                      },
                    ],
                  },
                  { text: "", margin: [0, 5, 0, 0], },
                  { text: "Sistema de monitoramento de serviços online", style: "muted" },
                  ...invoice.companyAddressLines.map(line => ({ text: line, style: "muted" })),
                  ...(invoice.companyPhone ? [{ text: invoice.companyPhone, style: "muted" }] : []),
                  ...[{ text: "systatus@artcode.dev", style: "muted" }],
                ]
              },
              {
                alignment: "right",
                stack: [
                  { text: `Fatura #${invoice.invoiceNumber}`, style: "invoiceTitle" },
                  {
                    margin: [0, 8, 0, 0],
                    table: {
                      widths: ["100%"],
                      body: [
                        [
                          {
                            text: InvoiceStatusLabelEnum[invoice.status],
                            color: "#FFF",
                            fillColor: statusColor[invoice.status],
                            bold: true,
                            alignment: "center",
                            margin: [8, 4]
                          }
                        ]
                      ]
                    },
                    layout: "noBorders"
                  }
                ]
              }
            ]
          },

          {
            margin: [0, 20, 0, 20],
            canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }]
          },

          {
            columns: [
              {
                width: "50%",
                stack: [
                  { text: "Data Fatura", style: "label" },
                  { text: invoice.issueDate, style: "value" },
                  { text: "Data Vencimento", style: "label", margin: [0, 8, 0, 0] },
                  { text: invoice.dueDate, style: "value" },
                ]
              },
              {
                width: "50%",
                stack: [
                  { text: invoice.customerName, style: "value" },
                  { text: invoice.customerEmail, style: "muted" },
                  ...invoice.customerAddressLines.map(line => ({ text: line, style: "muted" })),
                  ...(invoice.customerPhone ? [{ text: invoice.customerPhone, style: "muted" }] : []),
                ]
              }
            ]
          },

          {
            margin: [0, 30, 0, 10],
            canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }]
          },

          {
            table: {
              widths: ["*", "*", 70],
              body: [
                [
                  { text: "Item", style: "tableHeader" },
                  { text: "Período Assinatura", style: "tableHeader", alignment: "right" },
                  { text: "Valor", style: "tableHeader", alignment: "right" }
                ],
                [
                  { text: invoice.description, fontSize: 10 },
                  { text: invoice.period, alignment: "right", fontSize: 10 },
                  { text: `R$ ${invoice.amount}`, alignment: "right", fontSize: 10 }
                ]
              ]
            },
            layout: "lightHorizontalLines"
          },

          {
            margin: [0, 20, 0, 0],
            columns: [
              { width: "*", text: " " },
              {
                width: 200,
                table: {
                  body: [
                    [
                      { text: "Total", bold: true },
                      { text: `R$ ${invoice.amount} BRL`, bold: true }
                    ]
                  ]
                },
                layout: "noBorders"
              }
            ]
          },

          {
            margin: [0, 30, 0, 10],
            text: "Informações de Pagamento",
            style: "sectionTitle"
          },

          {
            columns: [
              {
                width: "50%",
                stack: [
                  { text: "Método", style: "label" },
                  { text: invoice.paymentMethod, style: "value" },
                  { text: "Transação", style: "label", margin: [0, 8, 0, 0] },
                  { text: invoice.transactionId, style: "value" },
                  { text: "Data Pagamento", style: "label", margin: [0, 8, 0, 0] },
                  { text: invoice.paymentDate, style: "value" },
                ]
              },
            ]
          },

          {
            margin: [0, 30, 0, 10],
            canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }]
          },

          {
            text: "Obrigado pela assinatura!",
            alignment: "center",
            style: "footer"
          },
          {
            text: "Para dúvidas sobre essa fatura, contate systatus@artcode.dev",
            alignment: "center",
            style: "footer"
          },
          {
            text: "Systatus.Live - Sistema de monitoramento de serviços online",
            alignment: "center",
            style: "footerSmall"
          }
        ],

        styles: {
          companyTitle: {
            fontSize: 18,
            bold: true
          },
          invoiceTitle: {
            fontSize: 16,
            bold: true
          },
          sectionTitle: {
            fontSize: 11,
            bold: true
          },
          tableHeader: {
            fontSize: 10,
            bold: true
          },
          label: {
            fontSize: 9,
            color: "#666"
          },
          value: {
            fontSize: 10,
            bold: true
          },
          muted: {
            fontSize: 9,
            color: "#666"
          },
          footer: {
            fontSize: 9,
            color: "#666"
          },
          footerSmall: {
            fontSize: 8,
            color: "#999"
          }
        }
      };

      const pdf = await this.pdfService.generatePDF(dd);
      response.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=systatuslive-fatura-${formatDate(rootData.due_date, "YYYY-DD-MM")}.pdf`,
        "Content-Length": pdf.length,
        "Access-Control-Expose-Headers": "Content-Disposition"
      });
      response.end(pdf);
    } catch (error) {
      throw new InternalServerErrorException("Falha ao retornar a fatura.");
    }
  }
}
