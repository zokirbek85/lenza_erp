import { useState, useEffect } from 'react';
import { Button, Card, Collapse, DatePicker, Drawer, Grid, Select, Space, Tooltip } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import http from '../app/http';
import { useDashboardStore } from '../store/useDashboardStore';

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

interface Dealer {
  id: number;
  name: string;
}

interface Region {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface DashboardFilterBarProps {
  onApply?: () => void;
}

const DashboardFilterBar = ({ onApply }: DashboardFilterBarProps) => {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { filters, setFilters, resetFilters } = useDashboardStore();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  const [localDealers, setLocalDealers] = useState<number[]>(filters.dealers);
  const [localRegion, setLocalRegion] = useState<number | undefined>(filters.region);
  const [localManager, setLocalManager] = useState<number | undefined>(filters.manager);
  const [localDateRange, setLocalDateRange] = useState<[Dayjs, Dayjs] | undefined>(
    filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : undefined
  );

  const [drawerVisible, setDrawerVisible] = useState(false);

  // Debug state
  useEffect(() => {
    console.log('Current dealers state:', dealers);
    console.log('Current regions state:', regions);
    console.log('Current managers state:', managers);
  }, [dealers, regions, managers]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const [dealersRes, regionsRes, managersRes] = await Promise.all([
          http.get('/api/dealers/?page_size=1000'),
          http.get('/api/regions/?page_size=1000'),
          http.get('/api/users/?role=sales&page_size=1000'),
        ]);
        
        console.log('Dealers response:', dealersRes.data);
        console.log('Regions response:', regionsRes.data);
        console.log('Managers response:', managersRes.data);
        
        // Handle both paginated and non-paginated responses
        const dealersData = dealersRes.data?.results || dealersRes.data || [];
        const regionsData = regionsRes.data?.results || regionsRes.data || [];
        const managersData = managersRes.data?.results || managersRes.data || [];
        
        console.log('Extracted dealers:', dealersData);
        console.log('Extracted regions:', regionsData);
        console.log('Extracted managers:', managersData);
        
        setDealers(Array.isArray(dealersData) ? dealersData : []);
        setRegions(Array.isArray(regionsData) ? regionsData : []);
        setManagers(Array.isArray(managersData) ? managersData : []);
      } catch (error) {
        console.error('Failed to load filter options', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleApply = () => {
    const newFilters = {
      dealers: localDealers,
      region: localRegion,
      manager: localManager,
      dateRange: localDateRange
        ? [localDateRange[0].format('YYYY-MM-DD'), localDateRange[1].format('YYYY-MM-DD')] as [string, string]
        : undefined,
    };
    setFilters(newFilters);
    if (onApply) {
      onApply();
    }
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const handleReset = () => {
    setLocalDealers([]);
    setLocalRegion(undefined);
    setLocalManager(undefined);
    setLocalDateRange(undefined);
    resetFilters();
    if (onApply) {
      onApply();
    }
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const filterContent = (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Tooltip title={t('dashboard.filters.dealerTooltip')}>
          <Select
            mode="multiple"
            placeholder={t('dashboard.filters.dealers')}
            value={localDealers}
            onChange={setLocalDealers}
            className="w-full"
            options={dealers.map((d) => ({ label: d.name, value: d.id }))}
            maxTagCount="responsive"
            allowClear
            loading={loading}
            notFoundContent={loading ? 'Loading...' : 'No dealers found'}
          />
        </Tooltip>
        <Tooltip title={t('dashboard.filters.regionTooltip')}>
          <Select
            placeholder={t('dashboard.filters.region')}
            value={localRegion}
            onChange={setLocalRegion}
            className="w-full"
            options={regions.map((r) => ({ label: r.name, value: r.id }))}
            allowClear
            loading={loading}
            notFoundContent={loading ? 'Loading...' : 'No regions found'}
          />
        </Tooltip>
        <Tooltip title={t('dashboard.filters.managerTooltip')}>
          <Select
            placeholder={t('dashboard.filters.manager')}
            value={localManager}
            onChange={setLocalManager}
            className="w-full"
            options={managers.map((m) => ({
              label: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.username,
              value: m.id,
            }))}
            allowClear
            loading={loading}
            notFoundContent={loading ? 'Loading...' : 'No managers found'}
          />
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip title={t('dashboard.filters.dateRangeTooltip')}>
          <RangePicker
            value={localDateRange}
            onChange={(dates) => setLocalDateRange(dates as [Dayjs, Dayjs] | undefined)}
            format="DD.MM.YYYY"
            className="flex-1"
          />
        </Tooltip>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {t('dashboard.filters.reset')}
          </Button>
          <Button type="primary" icon={<FilterOutlined />} onClick={handleApply}>
            {t('dashboard.filters.apply')}
          </Button>
        </Space>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={() => setDrawerVisible(true)}
          className="mb-4 w-full"
        >
          {t('dashboard.filters.title')}
        </Button>
        <Drawer
          title={t('dashboard.filters.title')}
          placement="right"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          width={320}
        >
          {filterContent}
        </Drawer>
      </>
    );
  }

  return (
    <Card
      className="mb-6 rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      bodyStyle={{ padding: '16px' }}
    >
      <Collapse
        defaultActiveKey={['filters']}
        ghost
        items={[
          {
            key: 'filters',
            label: (
              <div className="flex items-center gap-2">
                <FilterOutlined className="text-slate-600 dark:text-slate-300" />
                <span className="font-semibold text-slate-900 dark:text-white">{t('dashboard.filters.title')}</span>
              </div>
            ),
            children: filterContent,
          },
        ]}
      />
    </Card>
  );
};

export default DashboardFilterBar;
