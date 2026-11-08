using System.Text.Json;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Persistence.Seed;

internal static class DbInitializer
{
    private readonly static JsonSerializerOptions serializerOptions = new() { PropertyNameCaseInsensitive = true };
    private sealed class UserSeedDto
    {
        public string Id { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string DisplayName { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.MigrateAsync();

        if (await dbContext.Users.AnyAsync())
            return;

        var directoryPath = Path.Combine(
            Directory.GetCurrentDirectory(),
                "Infrastructure",
                "Persistence",
                "Seed",
                "Data");

        if (!Directory.Exists(directoryPath))
            Directory.CreateDirectory(directoryPath);

        string filePath = Path.Combine(directoryPath, "users.json");

        if (!File.Exists(filePath))
            return;

        string jsonData = await File.ReadAllTextAsync(filePath);
        var usersSeed = JsonSerializer.Deserialize<List<UserSeedDto>>(jsonData, serializerOptions);

        if (usersSeed?.Count > 0)
        {
            var passwordHasher = new PasswordHasher<User>();

            var usersToSeed = new List<User>();

            foreach (var dto in usersSeed)
            {
                var user = new User
                {
                    Id = dto.Id,
                    Email = dto.Email,
                    DisplayName = dto.DisplayName,
                    ProfilePictureUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.DisplayName)}&background=0D8ABC&color=fff&size=128&bold=true",
                    NormalizedEmail = dto.Email.ToUpper()
                };

                user.PasswordHash = passwordHasher.HashPassword(user, dto.Password);

                usersToSeed.Add(user);
            }

            dbContext.Users.AddRange(usersToSeed);
            await dbContext.SaveChangesAsync();

        }
    }
}
