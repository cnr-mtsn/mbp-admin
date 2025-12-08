import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardHeader, CardBody } from '../ui';
import styles from '../../styles/qrscanner.module.css';

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        stopScanner();
      },
      (error) => {
        console.debug('QR scan error:', error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
  };

  return (
    <Card className="mb-lg">
      <CardHeader>
        <h3 className="card-title">Scan QR Code</h3>
      </CardHeader>
      <CardBody>
        <div id="qr-reader" className={styles.scannerContainer}></div>
        <p className={`text-center mt-md ${styles.helpText}`}>
          Point your camera at a QR code to scan it. You can also use a handheld scanner to type the product ID directly into the search box.
        </p>
      </CardBody>
    </Card>
  );
}
