import { BadRequestException, Controller, Get, Param, Query, Request, Res, UseGuards } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthGuard } from "../guards/auth/auth.guard";
import { PdfService } from "src/services/pdf.service";
import { Response } from "express";
import { InvoiceStatusEnum, InvoiceStatusLabelEnum } from "src/types/InvoiceStatusEnum";
import formatDate from "src/utils/formatDate";
import { PaymentStatusEnum } from "src/types/PaymentStatusEnum";
import axios from "axios";
import { PlanEnum } from "src/types/PlanEnum";

@Controller({
  version: "1",
  path: "/invoices"
})
@UseGuards(AuthGuard)
export class InvoiceController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
    private pdfService: PdfService
  ) { }

  @Get("/")
  async getInvoiceList(@Request() request: Request, @Query("page") page: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select inv.*, plan.name as "plan"
        from invoices inv
        join subscriptions sub on sub.id = inv."subscriptionId"
        join plans plan on plan.id = sub."planId"
        where sub."userId" = '${request["loggedUser"]}'
        order by inv."createdAt" desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `),
      this.dataSource.query(`
        select count(1) as total
        from invoices inv
        join subscriptions sub on sub.id = inv."subscriptionId"
        join plans plan on plan.id = sub."planId"
        where sub."userId" = '${request["loggedUser"]}'
      `),
    ]);

    return {
      data: results[0],
      pagination: {
        rows: this.querySize,
        total: parseInt(results[1][0].total)
      }
    }
  }

  @Get("/:id/pdf")
  async pdfInvoicePDF(@Request() request: Request, @Res() response: Response, @Param("id") id: string) {
    const [rootData] = await this.dataSource.query(`
      select 
        inv.id
        , inv."issueDate"
        , inv."dueDate"
        , inv.amount
        , inv.status
        , usu.name as user
        , usu.email
        , pla.name as plan
        , pay.id as "paymentId"
        , pay."createdAt" as "paymentDate"
      from invoices inv
      join subscriptions sub on sub.id = inv."subscriptionId"
      join plans pla on pla.id = sub."planId"
      join users usu on usu.id = sub."userId"
      left join payments pay on pay."invoiceId" = inv.id and pay.status = '${PaymentStatusEnum.PAID}'
      where sub."userId" = '${request["loggedUser"]}'
      and inv.id = '${id}'
    `);

    if (!rootData) {
      throw new BadRequestException("Fatura não encontrada");
    }

    const invoice = {
      invoiceNumber: rootData.id,
      issueDate: formatDate(rootData.issueDate, "D [de] MMMM [de] YYYY"),
      dueDate: formatDate(rootData.dueDate, "D [de] MMMM [de] YYYY"),
      amount: rootData.amount,
      status: rootData.status,
      description: `Assinatura do plano "${rootData.plan}"`,
      customerName: rootData.user,
      customerEmail: rootData.email,
      customerAddress: "-",
      customerCity: "-",
      customerState: "-",
      customerZipCode: "-",
      customerCountry: "-",
      customerTaxId: "-",
      paymentMethod: rootData.plan == PlanEnum.ANDORINHA ? "Cortesia" : "-",
      paymentDate: rootData.paymentDate == null ? "-" : formatDate(rootData.paymentDate, "DD/MM/YYYY HH:mm:ss"),
      transactionId: rootData.paymentId || "-"
    };

    const statusColor = {
      [InvoiceStatusEnum.PAID]: "#05DF72",
      [InvoiceStatusEnum.PENDING]: "#FDC700",
      [InvoiceStatusEnum.CANCELED]: "#9b9b9bff",
      [InvoiceStatusEnum.DUEDATE]: "#FF6467"
    };

    const imageUrlToBase64 = async (imageUrl: string) => {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const contentType = response.headers["content-type"];
      const base64Image = `data:${contentType};base64,${Buffer.from(response.data).toString("base64")}`;
      return base64Image;
    };
    const systatusLogo = await imageUrlToBase64("https://systatus.live/logos/systatus-live.png");

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
                { text: "systatus@artcode.dev", style: "muted" },
                { text: "https://systatus.live", style: "muted" }
              ]
            },
            {
              alignment: "right",
              stack: [
                { text: "FATURA", style: "invoiceTitle" },
                { text: invoice.invoiceNumber, style: "muted", },
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
                // { text: invoice.customerAddress, style: "muted" },
                // {
                //   text: `${invoice.customerCity}, ${invoice.customerState} ${invoice.customerZipCode}`,
                //   style: "muted"
                // },
                // { text: invoice.customerCountry, style: "muted" },
                // { text: `Documento: ${invoice.customerTaxId}`, style: "muted" }
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
            widths: ["*", 30, 70],
            body: [
              [
                { text: "Descrição", style: "tableHeader" },
                { text: "Qtd.", style: "tableHeader", alignment: "right" },
                { text: "Valor", style: "tableHeader", alignment: "right" }
              ],
              [
                invoice.description,
                { text: "1", alignment: "right" },
                { text: `R$ ${invoice.amount.toFixed(2)}`, alignment: "right" }
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
                  ["Subtotal", `$${invoice.amount.toFixed(2)}`],
                  ["Impostos (0%)", "$0.00"],
                  [
                    { text: "Total", bold: true },
                    { text: `R$ ${invoice.amount.toFixed(2)} BRL`, bold: true }
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
          fontSize: 26,
          bold: true
        },
        sectionTitle: {
          fontSize: 11,
          bold: true
        },
        tableHeader: {
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
      "Content-Disposition": `inline; filename=systatuslive-fatura-${formatDate(rootData.dueDate, "YYYY-DD-MM")}.pdf`,
      "Content-Length": pdf.length,
      "Access-Control-Expose-Headers": "Content-Disposition"
    });

    response.end(pdf);
  }
}
