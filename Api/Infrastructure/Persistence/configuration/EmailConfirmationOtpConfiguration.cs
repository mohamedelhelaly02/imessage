using Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class EmailConfirmationOtpConfiguration : IEntityTypeConfiguration<EmailConfirmationOtp>
{
    public void Configure(EntityTypeBuilder<EmailConfirmationOtp> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.UserId)
            .HasMaxLength(450).IsRequired();

        builder.Property(x => x.CodeHash)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new
        {
            x.UserId,
            x.ConsumedAtUtc,
            x.ExpiresAtUtc
        });

        builder.ToTable("EmailConfirmationOtps");
    }
}
