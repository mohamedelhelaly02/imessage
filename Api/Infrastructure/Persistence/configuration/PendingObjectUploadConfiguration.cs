using Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class PendingObjectUploadConfiguration : IEntityTypeConfiguration<PendingObjectUpload>
{
    public void Configure(EntityTypeBuilder<PendingObjectUpload> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.HasIndex(x => new
        {
            x.UserId,
            x.ConversationId,
            x.ConsumedAtUtc
        });

        builder.HasIndex(x => x.ExpiresAtUtc);

        builder.ToTable("PendingObjectUploads");
    }
}
