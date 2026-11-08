using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "17730cce-afec-4db3-ada9-74f37a30478e");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "dbd4d5df-ae31-47dd-9973-31f1c950ff7f");

            migrationBuilder.AddColumn<string>(
                name: "PublicId",
                table: "Conversations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "78c9bb1c-9c58-4fea-be54-8cd0d3bf7f8c", "5d91b337-05a5-4372-9bfb-f4ce03d0c0a1", "Admin", "ADMIN" },
                    { "e56febee-b7de-492b-9877-dd76375b4b2e", "15511929-81c8-473c-8000-844263ab2083", "User", "USER" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "78c9bb1c-9c58-4fea-be54-8cd0d3bf7f8c");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "e56febee-b7de-492b-9877-dd76375b4b2e");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "Conversations");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "17730cce-afec-4db3-ada9-74f37a30478e", "e3c945c9-409e-4a89-a94d-3b77181d4d3d", "User", "USER" },
                    { "dbd4d5df-ae31-47dd-9973-31f1c950ff7f", "d126eae2-8bb6-4fe2-a3e6-af157eb7cf7b", "Admin", "ADMIN" }
                });
        }
    }
}
