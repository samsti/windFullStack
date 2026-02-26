using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mqtt.Controllers;
using StateleSSE.AspNetCore;
using StateleSSE.AspNetCore.EfRealtime;
using WindTurbineApi.Data;
using WindTurbineApi.Models;
using WindTurbineApi.Services;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"];
Console.WriteLine($"[Startup] Jwt:Key present={!string.IsNullOrEmpty(jwtKey)}, length={jwtKey?.Length ?? 0}");
if (string.IsNullOrEmpty(jwtKey))
    throw new InvalidOperationException("Jwt__Key environment variable is not set. Set it in Railway Variables.");

builder.Services.AddInMemorySseBackplane();
builder.Services.AddEfRealtime();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    options.AddEfRealtimeInterceptor(sp);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler =
        System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddMqttControllers();

builder.Services.AddSingleton<TurbineStateService>();
builder.Services.AddScoped<AlertService>();
builder.Services.AddHostedService<OfflineDetectionService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db  = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    db.Database.Migrate();

    // Seed default admin user if no users exist
    if (!db.Users.Any())
    {
        db.Users.Add(new User
        {
            Email        = cfg["Seed:AdminEmail"]!,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(cfg["Seed:AdminPassword"]!),
            Name         = cfg["Seed:AdminName"]!,
            CreatedAt    = DateTime.UtcNow,
        });
        db.SaveChanges();
    }
}

var mqtt = app.Services.GetRequiredService<IMqttClientService>();
await mqtt.ConnectAsync(
    builder.Configuration["Mqtt:BrokerHost"]!,
    int.Parse(builder.Configuration["Mqtt:BrokerPort"]!));

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
