declare module "nodemailer" {
  export function createTransport(config: unknown): {
    sendMail(options: {
      to: string;
      from?: string;
      subject: string;
      text: string;
      html: string;
    }): Promise<{
      rejected?: string[];
      pending?: string[];
    }>;
  };
}
