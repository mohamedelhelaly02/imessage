using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Infrastructure.Persistence.Configuration;

internal sealed class RoleConfiguration : IEntityTypeConfiguration<IdentityRole>
{
    public void Configure(EntityTypeBuilder<IdentityRole> builder)
    {
        builder.HasData(
            new IdentityRole
            {
                Id = "78c9bb1c-9c58-4fea-be54-8cd0d3bf7f8c",
                ConcurrencyStamp = "5d91b337-05a5-4372-9bfb-f4ce03d0c0a1",
                Name = "Admin",
                NormalizedName = "ADMIN"
            },
            new IdentityRole
            {
                Id = "e56febee-b7de-492b-9877-dd76375b4b2e",
                ConcurrencyStamp = "15511929-81c8-473c-8000-844263ab2083",
                Name = "User",
                NormalizedName = "USER"
            }
        );
    }
}
