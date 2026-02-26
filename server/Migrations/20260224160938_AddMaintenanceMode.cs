using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WindTurbineApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInMaintenance",
                table: "Turbines",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MaintenanceReason",
                table: "Turbines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MaintenanceSince",
                table: "Turbines",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsInMaintenance",
                table: "Turbines");

            migrationBuilder.DropColumn(
                name: "MaintenanceReason",
                table: "Turbines");

            migrationBuilder.DropColumn(
                name: "MaintenanceSince",
                table: "Turbines");
        }
    }
}
