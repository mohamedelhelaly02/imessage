using Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction>
{
    public void Configure(EntityTypeBuilder<MessageReaction> builder)
    {
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.Emoji).HasMaxLength(16).IsRequired();
        builder.HasOne(item => item.Message).WithMany(item => item.Reactions)
            .HasForeignKey(item => item.MessageId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(item => item.User).WithMany()
            .HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(item => new { item.MessageId, item.UserId, item.Emoji }).IsUnique();
    }
}
