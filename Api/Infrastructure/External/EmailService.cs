using Api.Application.Interfaces;
using Api.Shared.Helpers;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Api.Infrastructure.External;

public sealed class EmailService(
    IOptions<EmailSettings> emailOptions,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailSettings _settings = emailOptions.Value;

    public async Task SendEmailAsync(string emailTo, string subject, string htmlMessage, string? plainTextAlternate = null, List<IFormFile>? attachments = null)
    {
        try
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(MailboxAddress.Parse(emailTo));
            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlMessage,
                TextBody = plainTextAlternate ?? "Please view this email in an HTML-compatible client."
            };

            if (attachments != null)
            {
                foreach (var file in attachments)
                {
                    if (file.Length > 0)
                    {
                        await using var memoryStream = new MemoryStream();
                        await file.CopyToAsync(memoryStream);
                        builder.Attachments.Add(file.FileName, memoryStream.ToArray(), ContentType.Parse(file.ContentType));
                    }
                }
            }

            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();

            client.Timeout = 10000;

            SecureSocketOptions socketOptions = _settings.UseTls
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.Auto;

            logger.LogInformation("Connecting to SMTP server {Server}:{Port}...", _settings.Server, _settings.Port);

            await client.ConnectAsync(_settings.Server, _settings.Port, socketOptions);

            if (!string.IsNullOrEmpty(_settings.Username))
            {
                await client.AuthenticateAsync(_settings.Username, _settings.Password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Email successfully sent to {Email}", emailTo);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {Email}", emailTo);
            throw;
        }
    }

}
