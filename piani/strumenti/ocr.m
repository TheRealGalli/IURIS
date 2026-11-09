// OCR di un PDF con PDFKit + Vision: una riga JSON per pagina {"pagina":n,"testo":"..."}.
// Compila: clang -fobjc-arc -O2 ocr.m -framework Foundation -framework PDFKit -framework Vision -framework CoreGraphics -o ocr
// Uso: ./ocr <file.pdf> <uscita.jsonl> [pagina-da] [pagina-a]
#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>
#import <Vision/Vision.h>
int main(int argc, const char **argv) {
  @autoreleasepool {
    if (argc < 3) { fprintf(stderr, "uso: ocr <pdf> <out.jsonl> [da] [a]\n"); return 1; }
    PDFDocument *doc = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:@(argv[1])]];
    NSInteger da = argc > 3 ? atoi(argv[3]) : 1, a = argc > 4 ? atoi(argv[4]) : doc.pageCount;
    [[NSFileManager defaultManager] createFileAtPath:@(argv[2]) contents:nil attributes:nil];
    NSFileHandle *out = [NSFileHandle fileHandleForWritingAtPath:@(argv[2])];
    for (NSInteger i = da - 1; i < a; i++) @autoreleasepool {
      PDFPage *page = [doc pageAtIndex:i];
      NSRect box = [page boundsForBox:kPDFDisplayBoxMediaBox];
      CGFloat s = 2.5; size_t w = box.size.width * s, h = box.size.height * s;
      CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
      CGContextRef ctx = CGBitmapContextCreate(NULL, w, h, 8, 0, cs, kCGImageAlphaNoneSkipLast);
      CGContextSetRGBFillColor(ctx, 1, 1, 1, 1); CGContextFillRect(ctx, CGRectMake(0, 0, w, h));
      CGContextScaleCTM(ctx, s, s);
      [page drawWithBox:kPDFDisplayBoxMediaBox toContext:ctx];
      CGImageRef img = CGBitmapContextCreateImage(ctx);
      VNRecognizeTextRequest *req = [[VNRecognizeTextRequest alloc] init];
      req.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
      req.recognitionLanguages = @[@"it-IT"]; req.usesLanguageCorrection = YES;
      VNImageRequestHandler *hd = [[VNImageRequestHandler alloc] initWithCGImage:img options:@{}];
      [hd performRequests:@[req] error:nil];
      NSMutableArray *lines = [NSMutableArray array];
      for (VNRecognizedTextObservation *o in req.results) { VNRecognizedText *t = [o topCandidates:1].firstObject; if (t) [lines addObject:t.string]; }
      NSData *d = [NSJSONSerialization dataWithJSONObject:@{@"pagina": @(i + 1), @"testo": [lines componentsJoinedByString:@"\n"]} options:0 error:nil];
      [out writeData:d]; [out writeData:[@"\n" dataUsingEncoding:NSUTF8StringEncoding]];
      CGImageRelease(img); CGContextRelease(ctx); CGColorSpaceRelease(cs);
      fprintf(stderr, "pagina %ld/%ld\n", (long)i + 1, (long)a);
    }
  }
  return 0;
}
