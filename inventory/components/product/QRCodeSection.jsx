import { useState } from 'react';
import { Button } from '../ui';
import styles from '../../styles/qrcode-section.module.css';

export default function QRCodeSection({ productId, productType, onLoadQRCode }) {
  const [qrCode, setQrCode] = useState(null);

  const handleLoadQRCode = async () => {
    const code = await onLoadQRCode(productId);
    setQrCode(code);
  };

  const handlePrintQR = () => {
    if (!qrCode) return;

    const printWindow = window.open('', '', 'width=400,height=500');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            img {
              width: 300px;
              height: 300px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <img src="${qrCode}" alt="QR Code" />
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (productType !== 'paint' && productType !== 'stain') {
    return null;
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>
        QR Code
      </h4>
      {qrCode ? (
        <div className="flex flex-col items-center">
          <img
            src={qrCode}
            alt="Product QR Code"
            className={styles.qrImage}
          />
          <Button onClick={handlePrintQR} variant="success" className="mt-md">
            Print QR Code
          </Button>
        </div>
      ) : (
        <Button onClick={handleLoadQRCode} variant="outline">
          Show QR Code
        </Button>
      )}
    </div>
  );
}
