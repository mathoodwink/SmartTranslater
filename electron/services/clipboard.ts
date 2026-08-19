import { clipboard, nativeImage } from 'electron';

interface ClipboardSnapshot {
  text: string;
  html: string;
  rtf: string;
  bookmark: { title: string; url: string };
  imageDataUrl: string;
}

export function captureClipboard(): ClipboardSnapshot {
  const image = clipboard.readImage();

  return {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    rtf: clipboard.readRTF(),
    bookmark: clipboard.readBookmark(),
    imageDataUrl: image.isEmpty() ? '' : image.toDataURL(),
  };
}

export function restoreClipboard(snapshot: ClipboardSnapshot) {
  clipboard.clear();

  if (snapshot.text) {
    clipboard.writeText(snapshot.text);
  }

  if (snapshot.html) {
    clipboard.writeHTML(snapshot.html);
  }

  if (snapshot.rtf) {
    clipboard.writeRTF(snapshot.rtf);
  }

  if (snapshot.bookmark.url) {
    clipboard.writeBookmark(snapshot.bookmark.title, snapshot.bookmark.url);
  }

  if (snapshot.imageDataUrl) {
    clipboard.writeImage(nativeImage.createFromDataURL(snapshot.imageDataUrl));
  }
}
