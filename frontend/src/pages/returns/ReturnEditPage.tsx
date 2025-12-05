import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Spin } from 'antd';
import toast from 'react-hot-toast';

import { fetchReturnById, updateReturn, type ReturnRecord, type ReturnPayload } from '../../api/returnsApi';
import CreateReturnForm from './components/CreateReturnForm';

const ReturnEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [returnData, setReturnData] = useState<ReturnRecord | null>(null);

  useEffect(() => {
    const loadReturn = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await fetchReturnById(parseInt(id));
        setReturnData(data);
      } catch (error) {
        toast.error(t('returns.loadError'));
        console.error('Load error:', error);
        navigate('/returns');
      } finally {
        setLoading(false);
      }
    };

    loadReturn();
  }, [id, navigate, t]);

  const handleUpdate = async (payload: ReturnPayload) => {
    if (!id) return;

    try {
      await updateReturn(parseInt(id), payload);
      toast.success(t('returns.updateSuccess'));
      navigate('/returns');
    } catch (error) {
      toast.error(t('returns.updateError'));
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/returns');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!returnData) {
    return (
      <Card>
        <p className="text-center text-slate-500">{t('returns.notFound')}</p>
      </Card>
    );
  }

  return (
    <Card
      title={t('returns.editTitle')}
      className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <CreateReturnForm
        initialData={returnData}
        onCreated={handleUpdate}
        onCancel={handleCancel}
        isEdit
      />
    </Card>
  );
};

export default ReturnEditPage;
