type UploadZipResponse = {
  sessionId: string;
  filename: string;
};

type StartImportResponse = {
  started: boolean;
  filesSaved: number;
};

type ApiError = {
  error: string;
};

export function uploadZipFile(
  file: File,
  sessionId: string | null,
  onProgress: (percent: number) => void
): Promise<UploadZipResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) {
      formData.append("sessionId", sessionId);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.addEventListener("load", () => {
      let data: UploadZipResponse | ApiError;
      try {
        data = JSON.parse(xhr.responseText) as UploadZipResponse | ApiError;
      } catch {
        reject(new Error("Upload failed."));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as UploadZipResponse);
        return;
      }

      reject(new Error("error" in data ? data.error : "Upload failed."));
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.open("POST", "/api/import/upload");
    xhr.send(formData);
  });
}

export async function startImport(sessionId: string, force: boolean): Promise<StartImportResponse> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, force }),
  });
  const data = (await res.json()) as StartImportResponse | ApiError;
  if (!res.ok) {
    throw new Error("error" in data ? data.error : "Import failed to start.");
  }
  return data as StartImportResponse;
}

export async function clearUploadSession(sessionId: string): Promise<void> {
  await fetch("/api/import", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
