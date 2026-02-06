using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jobify.Migrations
{
    /// <inheritdoc />
    public partial class AddOpportunities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsOpen",
                table: "Opportunities",
                newName: "IsRemote");

            migrationBuilder.RenameColumn(
                name: "Deadline",
                table: "Opportunities",
                newName: "DeadlineUtc");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Opportunities",
                newName: "CreatedAtUtc");

            migrationBuilder.AlterColumn<int>(
                name: "Type",
                table: "Opportunities",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Opportunities",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Location",
                table: "Opportunities",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Opportunities",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "Opportunities",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Level",
                table: "Opportunities",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxPay",
                table: "Opportunities",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MinPay",
                table: "Opportunities",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "MaxPay",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "MinPay",
                table: "Opportunities");

            migrationBuilder.RenameColumn(
                name: "IsRemote",
                table: "Opportunities",
                newName: "IsOpen");

            migrationBuilder.RenameColumn(
                name: "DeadlineUtc",
                table: "Opportunities",
                newName: "Deadline");

            migrationBuilder.RenameColumn(
                name: "CreatedAtUtc",
                table: "Opportunities",
                newName: "CreatedAt");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Location",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Opportunities",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);
        }
    }
}
