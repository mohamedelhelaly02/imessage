using Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Text).HasMaxLength(10000);
        builder.Property(x => x.ContentJson).HasMaxLength(20000);
        builder.HasOne(x => x.Conversation).WithMany(x => x.Messages)
            .HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Sender).WithMany()
            .HasForeignKey(x => x.SenderUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ReplyToMessage).WithMany()
            .HasForeignKey(x => x.ReplyToMessageId).OnDelete(DeleteBehavior.NoAction);
        builder.HasIndex(x => new { x.ConversationId, x.CreatedAtUtc, x.Id });
        builder.HasIndex(x => new { x.ConversationId, x.IsPinned, x.CreatedAtUtc });
        builder.HasIndex(x => new { x.SenderUserId, x.ClientMessageId }).IsUnique();
    }
}
