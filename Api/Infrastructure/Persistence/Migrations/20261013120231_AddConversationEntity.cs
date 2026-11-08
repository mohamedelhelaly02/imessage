using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddConversationEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "021cdc11-e70e-487a-9253-86f02899908f");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "366be902-9365-4a5e-950a-549c1f8abb03");

            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMessageAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedById = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conversations_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Participants",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ConversationId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Participants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Participants_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Participants_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "17730cce-afec-4db3-ada9-74f37a30478e", "e3c945c9-409e-4a89-a94d-3b77181d4d3d", "User", "USER" },
                    { "dbd4d5df-ae31-47dd-9973-31f1c950ff7f", "d126eae2-8bb6-4fe2-a3e6-af157eb7cf7b", "Admin", "ADMIN" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_CreatedById",
                table: "Conversations",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Participants_ConversationId",
                table: "Participants",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_Participants_UserId_ConversationId",
                table: "Participants",
                columns: new[] { "UserId", "ConversationId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Participants");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "17730cce-afec-4db3-ada9-74f37a30478e");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "dbd4d5df-ae31-47dd-9973-31f1c950ff7f");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "021cdc11-e70e-487a-9253-86f02899908f", "8dc4594f-e16c-440f-8857-d432edc4c5a9", "User", "USER" },
                    { "366be902-9365-4a5e-950a-549c1f8abb03", "dc6f17d4-4659-4fcf-91b9-0badb112351b", "Admin", "ADMIN" }
                });
        }
    }
}
