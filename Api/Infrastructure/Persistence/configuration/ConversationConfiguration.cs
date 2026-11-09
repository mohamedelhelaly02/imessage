using Api.Domain.Entities;
using Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Title).IsRequired(false);

        builder.Property(x => x.Type)
            .HasConversion(
            x => x.ToString(),
            x => Enum.Parse<ConversationType>(x)
            );

        builder.HasOne(c => c.CreatedBy)
            .WithMany(u => u.Conversations)
            .HasForeignKey(c => c.CreatedById)
            .IsRequired();

    }
}
