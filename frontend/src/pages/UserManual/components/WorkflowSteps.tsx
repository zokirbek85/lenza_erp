import { Steps, Card } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import AlertBox from './AlertBox';

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  example?: string;
  warning?: string;
  success?: string;
  info?: string;
}

interface WorkflowStepsProps {
  title: string;
  steps: WorkflowStep[];
  current?: number;
}

const WorkflowSteps = ({ title, steps, current }: WorkflowStepsProps) => {
  return (
    <Card title={title} className="shadow-sm workflow-steps-card">
      <Steps
        current={current}
        direction="vertical"
        items={steps.map((step) => ({
          title: (
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {step.title}
            </span>
          ),
          description: (
            <div className="step-content mt-2 space-y-2">
              <p className="text-slate-700 dark:text-slate-300">{step.description}</p>

              {step.example && (
                <div className="example-block rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Misol:
                  </div>
                  <code className="text-sm text-slate-800 dark:text-slate-200">{step.example}</code>
                </div>
              )}

              {step.warning && (
                <AlertBox type="warning" title="DIQQAT">
                  {step.warning}
                </AlertBox>
              )}

              {step.success && (
                <AlertBox type="success" title="MUVAFFAQIYATLI">
                  {step.success}
                </AlertBox>
              )}

              {step.info && (
                <AlertBox type="info" title="BILISH KERAK">
                  {step.info}
                </AlertBox>
              )}
            </div>
          ),
          icon: current !== undefined && step.step - 1 < current ? <CheckCircleOutlined /> : undefined,
        }))}
      />
    </Card>
  );
};

export default WorkflowSteps;
