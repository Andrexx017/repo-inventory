using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Inventory.Infrastructure.Email;

// Envía correo vía SMTP (Gmail en desarrollo/entrega, ver backend/docs/decisions.md
// sección "Recuperación de contraseña") con MailKit — reemplazo moderno del
// SmtpClient de .NET, que Microsoft marca obsoleto.
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var smtpSection = _configuration.GetSection("Smtp");
        var host = smtpSection["Host"]
            ?? throw new InvalidOperationException("Falta configurar Smtp:Host.");
        var port = smtpSection.GetValue("Port", 587);
        var user = smtpSection["User"]
            ?? throw new InvalidOperationException("Falta configurar Smtp:User.");
        var password = smtpSection["Password"]
            ?? throw new InvalidOperationException("Falta configurar Smtp:Password.");
        var fromEmail = smtpSection["FromEmail"] ?? user;
        var fromName = smtpSection["FromName"] ?? "Sistema de Inventario";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(user, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
