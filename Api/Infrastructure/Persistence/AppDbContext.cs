using Api.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Api.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options)
{

    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<Conversation> Conversations { get; set; } = null!;
    public DbSet<Participant> Participants { get; set; } = null!;

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);

        optionsBuilder.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
