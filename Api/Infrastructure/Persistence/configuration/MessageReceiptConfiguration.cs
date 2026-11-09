using Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class MessageReceiptConfiguration : IEntityTypeConfiguration<MessageReceipt>
{
    public void Configure(EntityTypeBuilder<MessageReceipt> builder)
    {
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.HasOne(item => item.Message).WithMany(item => item.Receipts)
            .HasForeignKey(item => item.MessageId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(item => item.User).WithMany()
            .HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(item => new { item.MessageId, item.UserId }).IsUnique();
        builder.HasIndex(item => new { item.UserId, item.ReadAtUtc });
    }
}
