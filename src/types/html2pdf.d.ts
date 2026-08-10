declare module "html2pdf.js" {
  interface Options {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: Record<string, unknown>;
    jsPDF?: {
      orientation?: string;
      unit?: string;
      format?: string;
    };
  }

  interface Html2Pdf {
    set(options: Options): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    save(): Promise<void>;
    output(type: string): Promise<Blob | string>;
  }

  function html2pdf(): Html2Pdf;

  export default html2pdf;
}
