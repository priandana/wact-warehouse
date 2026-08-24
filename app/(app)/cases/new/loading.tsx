import { SkeletonWizardLayout } from '@/components/shared/SkeletonCard';

export default function NewCaseLoading() {
  return (
    <div className="page-padding py-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      <SkeletonWizardLayout />
    </div>
  );
}
