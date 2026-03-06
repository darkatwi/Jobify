using Tesseract;

namespace Jobify.Api.Services
{
    public class UniversityProofOcrService
    {
        public string ExtractText(string imagePath)
        {
            using var engine = new TesseractEngine("./tessdata", "eng", EngineMode.LstmOnly);
            engine.SetVariable("tessedit_pageseg_mode", "1");

            using var img = Pix.LoadFromFile(imagePath);
            using var page = engine.Process(img);

            return page.GetText();
        }
    }
}
