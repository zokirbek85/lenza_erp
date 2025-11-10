import { Button, Card, Col, DatePicker, Row, Select, Space, theme } from 'antd';
import { useState, useEffect } from 'react';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import http from '../app/http';

const { RangePicker } = DatePicker;

interface DealerOption {
  id: number;
  name: string;
}

interface RegionOption {
  id: number;
  name: string;
}

export interface OrderFiltersType {
  dealer?: number[];
  type?: string;
  status?: string;
  region?: number;
  from?: string;
  to?: string;
}

interface OrderFiltersProps {
  onChange: (filters: OrderFiltersType) => void;
}

const ORDER_TYPES = [
  { value: 'regular', label: 'Oddiy' },
  { value: 'reserve', label: 'Bron' },
];

const ORDER_STATUSES = [
  { value: 'created', label: 'Yaratilgan' },
  { value: 'confirmed', label: 'Tasdiqlangan' },
  { value: 'packed', label: "Yig'ilgan" },
  { value: 'shipped', label: 'Yuborilgan' },
  { value: 'delivered', label: 'Yetkazilgan' },
  { value: 'cancelled', label: 'Bekor qilingan' },
  { value: 'returned', label: 'Qaytarilgan' },
];

export default function OrderFilters({ onChange }: OrderFiltersProps) {
  const { token } = theme.useToken();
  
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState<{
    dealer: number[];
    type: string | undefined;
    status: string | undefined;
    region: number | undefined;
    dates: [Dayjs, Dayjs] | null;
  }>({
    dealer: [],
    type: undefined,
    status: undefined,
    region: undefined,
    dates: null,
  });

  // Load dealers and regions on mount
  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const [dealersRes, regionsRes] = await Promise.all([
          http.get('/api/dealers/', { params: { page_size: 1000 } }),
          http.get('/api/regions/', { params: { page_size: 1000 } }),
        ]);
        
        const dealersData = dealersRes.data?.results || dealersRes.data || [];
        const regionsData = regionsRes.data?.results || regionsRes.data || [];
        
        setDealers(dealersData);
        setRegions(regionsData);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (key: keyof typeof filters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApply = () => {
    const apiFilters: OrderFiltersType = {};
    
    if (filters.dealer.length > 0) {
      apiFilters.dealer = filters.dealer;
    }
    if (filters.type) {
      apiFilters.type = filters.type;
    }
    if (filters.status) {
      apiFilters.status = filters.status;
    }
    if (filters.region) {
      apiFilters.region = filters.region;
    }
    if (filters.dates && filters.dates[0] && filters.dates[1]) {
      apiFilters.from = filters.dates[0].format('YYYY-MM-DD');
      apiFilters.to = filters.dates[1].format('YYYY-MM-DD');
    }

    onChange(apiFilters);
  };

  const resetFilters = () => {
    const cleared = {
      dealer: [],
      type: undefined,
      status: undefined,
      region: undefined,
      dates: null,
    };
    setFilters(cleared);
    onChange({});
  };

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: '16px',
        background: token.colorBgContainer,
        borderColor: token.colorBorder,
      }}
      bordered
      title={
        <Space>
          <FilterOutlined style={{ color: '#d4af37' }} />
          <span style={{ color: token.colorText }}>Filtrlar</span>
        </Space>
      }
    >
      <Row gutter={[12, 12]} align="middle">
        {/* Dealer Filter */}
        <Col xs={24} sm={12} md={6} lg={5}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Dilerlar"
            value={filters.dealer}
            onChange={(v) => handleChange('dealer', v)}
            loading={loading}
            style={{ width: '100%' }}
            options={dealers.map(d => ({ value: d.id, label: d.name }))}
            maxTagCount="responsive"
          />
        </Col>

        {/* Order Type Filter */}
        <Col xs={12} sm={12} md={4}>
          <Select
            allowClear
            placeholder="Buyurtma turi"
            value={filters.type}
            options={ORDER_TYPES}
            onChange={(v) => handleChange('type', v)}
            style={{ width: '100%' }}
          />
        </Col>

        {/* Status Filter */}
        <Col xs={12} sm={12} md={5}>
          <Select
            allowClear
            placeholder="Status"
            value={filters.status}
            options={ORDER_STATUSES}
            onChange={(v) => handleChange('status', v)}
            style={{ width: '100%' }}
          />
        </Col>

        {/* Region Filter */}
        <Col xs={12} sm={12} md={4}>
          <Select
            allowClear
            placeholder="Hudud"
            value={filters.region}
            onChange={(v) => handleChange('region', v)}
            loading={loading}
            style={{ width: '100%' }}
            options={regions.map(r => ({ value: r.id, label: r.name }))}
          />
        </Col>

        {/* Date Range Filter */}
        <Col xs={24} sm={12} md={5}>
          <RangePicker
            format="YYYY-MM-DD"
            value={filters.dates}
            onChange={(v) => handleChange('dates', v)}
            style={{ width: '100%' }}
            placeholder={['Boshlanish', 'Tugash']}
          />
        </Col>

        {/* Action Buttons */}
        <Col xs={24} md={6} lg={5}>
          <Space wrap>
            <Button 
              icon={<FilterOutlined />} 
              type="primary"
              onClick={handleApply}
              style={{ 
                background: '#d4af37',
                borderColor: '#d4af37',
                color: '#1e1e1e',
              }}
            >
              Qo'llash
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={resetFilters}
            >
              Tozalash
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
