using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jobify.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruiterUserIdToOpportunities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
            name: "RecruiterUserId",
            table: "Opportunities",
            type: "nvarchar(max)",
            nullable: false,
            defaultValue: "");
        }

        /// <inheritdoc />
       protected override void Down(MigrationBuilder migrationBuilder)
       {
            migrationBuilder.DropColumn(
            name: "RecruiterUserId",
            table: "Opportunities");
       }

    }
}
