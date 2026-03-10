using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WindTurbineApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMetricsIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TurbineMetrics_TurbineId",
                table: "TurbineMetrics");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_TurbineMetrics_TurbineId",
                table: "TurbineMetrics",
                column: "TurbineId");
        }
    }
}
