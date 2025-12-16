import { Card, Steps } from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import AlertBox from './AlertBox';

export interface ScenarioStep {
  actor: string;
  action: string;
  note?: string;
  instruction?: string;
  warning?: string;
  result?: string[];
}

interface ExampleScenarioProps {
  title: string;
  type?: 'common' | 'advanced' | 'error';
  steps: ScenarioStep[];
  conclusion?: string;
}

const actorIcons: Record<string, React.ReactNode> = {
  Diller: <UserOutlined />,
  'Sotuv menejeri': <ShoppingCartOutlined />,
  Omborchi: <ShoppingCartOutlined />,
  Sistema: <SettingOutlined />,
  Moliyachi: <UserOutlined />,
  Admin: <SettingOutlined />,
};

const ExampleScenario = ({ title, type = 'common', steps, conclusion }: ExampleScenarioProps) => {
  const typeColors = {
    common: 'border-blue-200 dark:border-blue-800',
    advanced: 'border-green-200 dark:border-green-800',
    error: 'border-red-200 dark:border-red-800',
  };

  const typeLabels = {
    common: '📌 Oddiy holat',
    advanced: '🎯 Murakkab holat',
    error: '❌ Xato holat',
  };

  return (
    <Card
      className={`shadow-sm example-scenario-card border-l-4 ${typeColors[type]}`}
      title={
        <div className="flex items-center gap-2">
          <span className="text-base">{typeLabels[type]}</span>
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        </div>
      }
    >
      <Steps
        direction="vertical"
        items={steps.map((step) => ({
          title: (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{step.actor}</span>
            </div>
          ),
          description: (
            <div className="space-y-2">
              <p className="text-sm text-slate-800 dark:text-slate-200">{step.action}</p>

              {step.note && (
                <div className="rounded bg-blue-50 p-2 text-xs italic text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  💡 {step.note}
                </div>
              )}

              {step.instruction && (
                <div className="rounded bg-slate-100 p-3 dark:bg-slate-800">
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Ko'rsatma:
                  </div>
                  <code className="text-xs text-slate-800 dark:text-slate-200">{step.instruction}</code>
                </div>
              )}

              {step.warning && (
                <AlertBox type="warning">
                  <span className="text-xs">{step.warning}</span>
                </AlertBox>
              )}

              {step.result && step.result.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Natija:</div>
                  <ul className="ml-4 space-y-1">
                    {step.result.map((res, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                        {res}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          icon: actorIcons[step.actor] || <UserOutlined />,
        }))}
      />

      {conclusion && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <div className="flex items-start gap-2">
            <CheckCircleOutlined className="mt-1 text-green-600 dark:text-green-400" />
            <div>
              <div className="mb-1 text-sm font-semibold text-green-800 dark:text-green-300">Xulosa:</div>
              <p className="text-sm text-green-700 dark:text-green-200">{conclusion}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ExampleScenario;
