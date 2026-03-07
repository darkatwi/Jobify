using Tesseract;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Png;

namespace Jobify.Api.Services
{
    public class UniversityProofOcrService
    {
        private readonly string _tessdataPath;

        public UniversityProofOcrService(IWebHostEnvironment env)
        {
            _tessdataPath = Path.Combine(env.ContentRootPath, "tessdata");
        }

        public string ExtractText(string imagePath)
        {
            var processedPath = PreprocessImage(imagePath);

            using var engine = new TesseractEngine(_tessdataPath, "eng", EngineMode.LstmOnly);
            using var img = Pix.LoadFromFile(processedPath);
            using var page = engine.Process(img, PageSegMode.Auto);

            return page.GetText() ?? string.Empty;
        }

        private string PreprocessImage(string imagePath)
        {
            var tempPath = Path.Combine(
                Path.GetDirectoryName(imagePath)!,
                $"{Path.GetFileNameWithoutExtension(imagePath)}_processed.png"
            );

            using var image = Image.Load(imagePath);

            image.Mutate(x =>
            {
                x.AutoOrient();
                x.Grayscale();
                x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(image.Width * 2, image.Height * 2)
                });
                x.Contrast(1.3f);
            });

            image.Save(tempPath, new PngEncoder());

            return tempPath;
        }
    }
}
