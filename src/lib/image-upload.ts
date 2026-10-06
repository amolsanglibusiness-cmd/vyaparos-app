export const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1200;

/**
 * Reads an uploaded image, resizes it for fast offline/local storage, and
 * returns a persistent data URL. No URL input is required from the user.
 */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file.'));
      return;
    }

    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      reject(new Error('Image must be 2MB or smaller.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Unable to read the image.'));

    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(source);
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        // JPEG keeps the offline database much smaller than raw camera images.
        const optimized = canvas.toDataURL('image/jpeg', 0.82);
        resolve(optimized);
      };

      image.onerror = () => reject(new Error('Unable to process the selected image.'));
      image.src = source;
    };

    reader.readAsDataURL(file);
  });
}
