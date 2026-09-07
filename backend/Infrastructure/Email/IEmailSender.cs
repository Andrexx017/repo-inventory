namespace Inventory.Infrastructure.Email;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody);

    // Automatización de envío de reportes (Opción 6): mismo mensaje que
    // SendAsync, con el PDF/Excel generado como adjunto.
    Task SendWithAttachmentAsync(
        string toEmail, string subject, string htmlBody,
        string attachmentFileName, byte[] attachmentContent, string attachmentContentType);
}
