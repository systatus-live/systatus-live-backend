import Pdfmake from "pdfmake";
import { TFontDictionary } from "pdfmake/interfaces";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PdfService {
  private fontsDir = `${__dirname}/../assets/fonts/Roboto`;

  private fonts: TFontDictionary = {
    Roboto: {
      normal: `${this.fontsDir}/Roboto-Regular.ttf`,
      bold: `${this.fontsDir}/Roboto-Medium.ttf`,
      italics: `${this.fontsDir}/Roboto-Italic.ttf`,
      bolditalics: `${this.fontsDir}/Roboto-MediumItalic.ttf`
    }
  }

  generatePDF(docDefinition: any): Promise<Buffer> {
    const printer = new Pdfmake(this.fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    return new Promise((resolve, reject) => {
      try {
        var chunks: any[] = [];
        pdfDoc.on("data", chunk => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
