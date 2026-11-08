namespace Api.Application.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string emailTo, string subject, string htmlMessage, string? plainTextAlternate = null, List<IFormFile>? attachments = null);
}
