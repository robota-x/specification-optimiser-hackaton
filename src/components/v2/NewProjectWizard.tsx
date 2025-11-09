/**
 * New Project Wizard - Multi-step form for creating a v2 project
 * Implements the "Preliminaries Wizard" from the implementation doc
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useContractTypes, usePreliminariesClauses } from '@/hooks/useV2MasterLibrary';
import { useCreateProject } from '@/hooks/useV2Projects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { ProjectInsert, FieldValues } from '@/types/v2-schema';

// Default organisation ID from seed data
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface NewProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  project_location: string;
  client_name: string;
  contract_type_id: string;
  architect_name: string;
  principal_designer: string;
  employer_name: string;
  project_reference: string;
}

type WizardStep = 'details' | 'contract' | 'preliminaries';

export function NewProjectWizard({ open, onOpenChange }: NewProjectWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<WizardStep>('details');
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    project_location: '',
    client_name: '',
    contract_type_id: '',
    architect_name: '',
    principal_designer: '',
    employer_name: '',
    project_reference: '',
  });

  // Queries
  const { data: contractTypes, isLoading: contractTypesLoading } = useContractTypes();
  const { data: preliminaryClauses, isLoading: prelimsLoading } = usePreliminariesClauses(
    formData.contract_type_id || undefined
  );

  // Mutations
  const createProject = useCreateProject();

  const handleNext = () => {
    if (step === 'details') {
      if (!formData.name) {
        toast({
          title: 'Required field',
          description: 'Please enter a project name',
          variant: 'destructive',
        });
        return;
      }
      setStep('contract');
    } else if (step === 'contract') {
      if (!formData.contract_type_id) {
        toast({
          title: 'Required field',
          description: 'Please select a contract type',
          variant: 'destructive',
        });
        return;
      }
      setStep('preliminaries');
    }
  };

  const handleBack = () => {
    if (step === 'preliminaries') setStep('contract');
    else if (step === 'contract') setStep('details');
  };

  const handleComplete = async () => {
    if (!formData.contract_type_id) {
      toast({
        title: 'Error',
        description: 'Contract type is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const projectData: ProjectInsert = {
        organisation_id: DEFAULT_ORG_ID,
        user_id: '', // Will be set by service
        name: formData.name,
        description: formData.description || null,
        project_location: formData.project_location || null,
        client_name: formData.client_name || null,
        contract_type_id: formData.contract_type_id,
        architect_name: formData.architect_name || null,
        principal_designer: formData.principal_designer || null,
        employer_name: formData.employer_name || null,
        project_reference: formData.project_reference || null,
        status: 'active',
      };

      const newProject = await createProject.mutateAsync({
        projectData,
        organisationId: DEFAULT_ORG_ID,
      });

      toast({
        title: 'Project created',
        description: `${formData.name} has been created successfully`,
      });

      // Close wizard and navigate to editor
      onOpenChange(false);
      navigate(`/v2/spec/${newProject.project_id}`);

      // Reset form for next time
      setFormData({
        name: '',
        description: '',
        project_location: '',
        client_name: '',
        contract_type_id: '',
        architect_name: '',
        principal_designer: '',
        employer_name: '',
        project_reference: '',
      });
      setStep('details');
    } catch (error: any) {
      toast({
        title: 'Error creating project',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateField = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' && 'New Project - Details'}
            {step === 'contract' && 'New Project - Contract Type'}
            {step === 'preliminaries' && 'New Project - Preliminaries'}
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Enter the basic project information'}
            {step === 'contract' && 'Select the contract type for this project'}
            {step === 'preliminaries' && 'Complete the preliminaries information (Section A)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Project Details */}
          {step === 'details' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Riverdale Residential - Phase 1"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Brief description of the project"
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_location">Project Location</Label>
                <Input
                  id="project_location"
                  value={formData.project_location}
                  onChange={(e) => updateField('project_location', e.target.value)}
                  placeholder="e.g., 123 High Street, London, SW1A 1AA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  placeholder="e.g., ABC Development Ltd"
                />
              </div>
            </>
          )}

          {/* Step 2: Contract Type */}
          {step === 'contract' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="contract_type">Contract Type *</Label>
                {contractTypesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={formData.contract_type_id}
                    onValueChange={(value) => updateField('contract_type_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes?.map((ct) => (
                        <SelectItem key={ct.contract_type_id} value={ct.contract_type_id}>
                          {ct.code} - {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-muted-foreground">
                  This determines which preliminaries clauses will be auto-populated
                </p>
              </div>
            </>
          )}

          {/* Step 3: Preliminaries */}
          {step === 'preliminaries' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="architect_name">Architect Name</Label>
                  <Input
                    id="architect_name"
                    value={formData.architect_name}
                    onChange={(e) => updateField('architect_name', e.target.value)}
                    placeholder="e.g., ABC Architecture Ltd"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="principal_designer">Principal Designer</Label>
                  <Input
                    id="principal_designer"
                    value={formData.principal_designer}
                    onChange={(e) => updateField('principal_designer', e.target.value)}
                    placeholder="e.g., XYZ Design Studio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer_name">Employer Name</Label>
                  <Input
                    id="employer_name"
                    value={formData.employer_name}
                    onChange={(e) => updateField('employer_name', e.target.value)}
                    placeholder="e.g., Client Name or Organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_reference">Project Reference</Label>
                  <Input
                    id="project_reference"
                    value={formData.project_reference}
                    onChange={(e) => updateField('project_reference', e.target.value)}
                    placeholder="e.g., PROJ-2025-001"
                  />
                </div>

                {prelimsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading preliminaries clauses...
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-medium mb-2">
                      Preliminaries clauses to be auto-populated:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {preliminaryClauses?.length || 0} clauses will be added to your project
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'details' || createProject.isPending}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            {step !== 'preliminaries' ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleComplete} disabled={createProject.isPending}>
                {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
