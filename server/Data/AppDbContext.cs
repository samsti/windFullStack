using Microsoft.EntityFrameworkCore;
using WindTurbineApi.Models;

namespace WindTurbineApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Turbine> Turbines => Set<Turbine>();
    public DbSet<TurbineMetric> TurbineMetrics => Set<TurbineMetric>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<OperatorCommand> OperatorCommands => Set<OperatorCommand>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Turbine>().HasKey(t => t.Id);

        modelBuilder.Entity<TurbineMetric>()
            .HasOne(m => m.Turbine)
            .WithMany(t => t.Metrics)
            .HasForeignKey(m => m.TurbineId);

        modelBuilder.Entity<Alert>()
            .HasOne(a => a.Turbine)
            .WithMany(t => t.Alerts)
            .HasForeignKey(a => a.TurbineId);

        modelBuilder.Entity<OperatorCommand>()
            .HasOne(c => c.Turbine)
            .WithMany(t => t.Commands)
            .HasForeignKey(c => c.TurbineId);
    }
}
