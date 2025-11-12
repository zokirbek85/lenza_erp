import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Result
        status="404"
        title="404"
        subTitle="Sahifa topilmadi yoki ko'chirilgan bo'lishi mumkin."
        extra={
          <Button type="primary">
            <Link to="/">Bosh sahifaga qaytish</Link>
          </Button>
        }
      />
    </div>
  );
}
