using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "7c6de888-fd83-4a62-abfa-15158fac14a3");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "7e7abca8-3185-4bd9-b6c5-604e5c0757dc");

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FamilyId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReplacedByTokenId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "021cdc11-e70e-487a-9253-86f02899908f", "8dc4594f-e16c-440f-8857-d432edc4c5a9", "User", "USER" },
                    { "366be902-9365-4a5e-950a-549c1f8abb03", "dc6f17d4-4659-4fcf-91b9-0badb112351b", "Admin", "ADMIN" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "021cdc11-e70e-487a-9253-86f02899908f");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "366be902-9365-4a5e-950a-549c1f8abb03");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "7c6de888-fd83-4a62-abfa-15158fac14a3", "ee1ecb0a-443e-434e-b28f-ffc44a149255", "Admin", "ADMIN" },
                    { "7e7abca8-3185-4bd9-b6c5-604e5c0757dc", "d2e8251d-92fe-454c-88a1-3714c760a05e", "User", "USER" }
                });
        }
    }
}
