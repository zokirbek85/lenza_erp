import http from '../app/http';

export const downloadFile = async (url: string, filename: string, method: 'GET' | 'POST' = 'GET', data?: unknown) => {
  const response = await http.request({
    url,
    method,
    data,
    responseType: 'blob',
  });
  
  // Ensure UTF-8 encoding for blob
  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { 
    type: contentType.includes('charset') ? contentType : `${contentType}; charset=utf-8`
  });
  
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(href);
};
