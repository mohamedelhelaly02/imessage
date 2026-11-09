using Api.Domain.Entities;
using Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

public sealed class ParticipantConfiguration : IEntityTypeConfiguration<Participant>
{
    public void Configure(EntityTypeBuilder<Participant> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(p => p.Role)
            .HasConversion(
            r => r.ToString(),
            x => Enum.Parse<ParticipantRole>(x)
            );

        builder.HasOne(p => p.Conversation)
          .WithMany(c => c.Participants)
          .HasForeignKey(c => c.ConversationId)
          .OnDelete(DeleteBehavior.Cascade)
          .IsRequired();

        builder.HasOne(p => p.User)
            .WithMany(u => u.Participants)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();


        builder.HasIndex(x => new { x.UserId, x.ConversationId }).IsUnique();

    }
}