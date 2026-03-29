using System.Net.Http;
using System.Security.Claims;
using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Xunit;

namespace Jobify.Tests.Controllers.ApplicationTests;

public class ApplicationControllerFileTests
{
    private static AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new AppDbContext(options);
    }

    private static ApplicationController CreateController(
        AppDbContext db,
        string contentRootPath,
        string? userId = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var controller = new ApplicationController(
            db,
            new FakeHttpClientFactory(),
            config,
            new FakeWebHostEnvironment { ContentRootPath = contentRootPath });

        if (!string.IsNullOrWhiteSpace(userId))
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId)
            };

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = principal
                }
            };
        }

        return controller;
    }

    [Fact]
    public async Task GetStudentFile_MissingParams_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(GetStudentFile_MissingParams_ReturnsBadRequest));
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempRoot);

        try
        {
            var controller = CreateController(db, tempRoot, "recruiter-1");

            var result = await controller.GetStudentFile("", "");

            Assert.IsType<BadRequestResult>(result);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, true);
        }
    }

    [Fact]
    public async Task GetStudentFile_FileNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(GetStudentFile_FileNotFound_ReturnsNotFound));
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempRoot);

        try
        {
            var controller = CreateController(db, tempRoot, "recruiter-1");

            var result = await controller.GetStudentFile("student-1", "resume.pdf");

            Assert.IsType<NotFoundResult>(result);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, true);
        }
    }

    [Fact]
    public async Task GetStudentFile_Pdf_ReturnsFileWithCorrectContentType()
    {
        using var db = CreateDbContext(nameof(GetStudentFile_Pdf_ReturnsFileWithCorrectContentType));
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        var studentDir = Path.Combine(tempRoot, "Uploads", "Students", "student-1");
        Directory.CreateDirectory(studentDir);

        var filePath = Path.Combine(studentDir, "resume.pdf");
        await File.WriteAllBytesAsync(filePath, new byte[] { 1, 2, 3, 4 });

        try
        {
            var controller = CreateController(db, tempRoot, "recruiter-1");

            var result = await controller.GetStudentFile("student-1", "resume.pdf");

            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/pdf", fileResult.ContentType);
            Assert.Equal("resume.pdf", fileResult.FileDownloadName);
            Assert.Equal(new byte[] { 1, 2, 3, 4 }, fileResult.FileContents);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, true);
        }
    }

    [Fact]
    public async Task GetStudentFile_Png_ReturnsFileWithCorrectContentType()
    {
        using var db = CreateDbContext(nameof(GetStudentFile_Png_ReturnsFileWithCorrectContentType));
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        var studentDir = Path.Combine(tempRoot, "Uploads", "Students", "student-1");
        Directory.CreateDirectory(studentDir);

        var filePath = Path.Combine(studentDir, "proof.png");
        await File.WriteAllBytesAsync(filePath, new byte[] { 9, 8, 7 });

        try
        {
            var controller = CreateController(db, tempRoot, "recruiter-1");

            var result = await controller.GetStudentFile("student-1", "proof.png");

            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("image/png", fileResult.ContentType);
            Assert.Equal("proof.png", fileResult.FileDownloadName);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, true);
        }
    }

    [Fact]
    public async Task GetStudentFile_Jpg_ReturnsFileWithCorrectContentType()
    {
        using var db = CreateDbContext(nameof(GetStudentFile_Jpg_ReturnsFileWithCorrectContentType));
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        var studentDir = Path.Combine(tempRoot, "Uploads", "Students", "student-1");
        Directory.CreateDirectory(studentDir);

        var filePath = Path.Combine(studentDir, "photo.jpg");
        await File.WriteAllBytesAsync(filePath, new byte[] { 5, 6, 7 });

        try
        {
            var controller = CreateController(db, tempRoot, "recruiter-1");

            var result = await controller.GetStudentFile("student-1", "photo.jpg");

            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("image/jpeg", fileResult.ContentType);
            Assert.Equal("photo.jpg", fileResult.FileDownloadName);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, true);
        }
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Jobify.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = "wwwroot";
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}