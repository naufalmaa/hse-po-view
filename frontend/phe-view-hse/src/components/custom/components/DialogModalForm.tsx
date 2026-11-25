import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cloneElement, useEffect, useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";

export type ModalFormProps = {
  title: string;
  desc?: React.ReactNode;
  content: React.ReactElement;
  info?: React.ReactNode;
  textConfirm?: string;
  textCancel?: string;
  onConfirmClick: (body: Record<string, any>) => void;
  onCancelClick?: () => void;
  modal?: boolean;
  child?: any;
  defaultValue: Record<string, any>;
  schema: any;
};

export type DialogModalFormProps = {
  modal?: ModalFormProps;
  onDismissOutside?: boolean;
  className?: string;
  classNameConfirm?: string;
  classNameCancel?: string;
  variantSubmit?: string;
};

export const DialogModalForm = ({
  modal = {
    title: "Title",
    desc: "Text Descriptions",
    content: <div />,
    textConfirm: "Yes",
    textCancel: "No",
    onConfirmClick: () => {
    },
    onCancelClick: () => {
    },
    modal: true,
    defaultValue: {},
    child: null,
    schema: null,
    info: null
  },
  onDismissOutside = false,
  classNameConfirm = "",
  classNameCancel = "",
  variantSubmit = "default",
  ...props
}: DialogModalFormProps) => {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(true); // Keep the dialog open
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error message

  // First, define the expected props type for the content component
  interface DialogContentProps {
    values?: any;  // Replace 'any' with a more specific type if possible
    form: ReturnType<typeof useForm>;  // Or a more specific form type
  }

  const form = useForm({
    resolver: modal.schema
      ? zodResolver(modal.schema instanceof z.ZodType ? modal.schema : z.object(modal.schema))
      : undefined,
    defaultValues: modal.defaultValue,
  });

  // Add a function to get detailed validation results
  const getDetailedValidationErrors = async () => {
    try {
      // Manually validate with Zod to see detailed errors
      if (modal.schema) {
        const schema = modal.schema instanceof z.ZodType ? modal.schema : z.object(modal.schema);
        const values = form.getValues();

        try {
          const result = await schema.safeParseAsync(values);

          if (!result.success) {
            return result.error.flatten();
          } else {
            return null;
          }
        } catch (zodError: any) {
          return { formErrors: [zodError.message || t($ => $.dialog.formValidationErrorGeneric)] };
        }
      }
      return null;
    } catch (error) {
      return { formErrors: [t($ => $.dialog.formValidationError)] };
    }
  };

  // Enhanced validation function that provides better error reporting
  const validateForm = async () => {
    try {
      // First, trigger the built-in validation
      const isValid = await form.trigger();

      // Get form values and errors
      const formValues = form.getValues();
      const formErrors = form.formState.errors;

      // If validation failed but we don't see errors, do manual validation
      if (!isValid && Object.keys(formErrors).length === 0) {
        const zodErrors = await getDetailedValidationErrors();
        return { isValid: false, errors: zodErrors || { formErrors: [t($ => $.dialog.formValidationError)] } };
      }

      // Return the validation result
      return { isValid, errors: isValid ? null : formErrors };
    } catch (error) {
      return { isValid: false, errors: { formErrors: [t($ => $.dialog.formValidationErrorUnknown)] } };
    }
  };

  // Reset form when defaultValues change
  useEffect(() => {
    if (modal?.defaultValue) {
      form.reset(modal.defaultValue);
      setErrorMessage(null); // Clear error message when form resets
    }
  }, [modal]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        modal?.onCancelClick && modal.onCancelClick()
      }
    }} modal={modal?.modal}>
      <DialogContent
        className="flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby=""
      >
        <DialogHeader className={"flex flex-col"}>
          <DialogTitle>{modal?.title}</DialogTitle>
          {modal?.desc && <DialogDescription>{modal?.desc}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v: Record<string, any>) => {
            modal?.onConfirmClick(v)
          })} className={"flex flex-col h-full flex-1 overflow-y-auto"}>
            {/* Display error message directly in the dialog */}
            {errorMessage && (
              <div
                className="mb-4 rounded-lg border p-4 text-sm bg-red-50 border-red-200 text-red-800"
                style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}
              >
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-medium">{t($ => $.dialog.error)}:</span>
                </div>
                <div className="mt-1 ml-6">
                  {errorMessage}
                </div>
              </div>
            )}
            <div className={"flex flex-col h-full flex-1 overflow-y-auto"}>
              {(modal?.child && modal?.content) &&
                cloneElement<DialogContentProps>(modal.content as React.ReactElement<DialogContentProps>, {
                  values: modal.child,
                  form
                })
              }
            </div>

            {modal?.info && <div className="flex-shrink-0">
              {modal.info}
            </div>}

            <DialogFooter className="flex-shrink-0">
              <div className="w-full flex sm:flex-row flex-col gap-2 justify-end pt-4">
                <Button className="min-w-[80px]" type="submit" onClick={async (e) => {
                  e.preventDefault();
                  try {
                    // Clear previous error message
                    setErrorMessage(null);

                    const { isValid, errors } = await validateForm();
                    // console.log("------isValid------", isValid, errors, form.getValues());

                    if (!isValid) {
                      // Handle errors based on their type
                      if (errors) {
                        let errorMessage = t($ => $.dialog.formValidationError);

                        // Check if it's a Zod flattened error object
                        if ('fieldErrors' in errors) {
                          // Handle field-specific errors
                          const fieldErrors = errors.fieldErrors;
                          if (fieldErrors && typeof fieldErrors === 'object') {
                            const errorMessages = Object.entries(fieldErrors)
                              .map(([fieldName, fieldErrors]) => {
                                const errorMessage = Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors;
                                return errorMessage;
                              });

                            if (errorMessages.length > 0) {
                              errorMessage = errorMessages[0];
                            }
                          }
                          // console.log("------fieldErrors------", errorMessage);
                        }
                        // Check if it's form-level errors
                        else if ('formErrors' in errors) {
                          const formErrors = (errors as any).formErrors;
                          if (Array.isArray(formErrors)) {
                            if (formErrors.length > 0) {
                              errorMessage = formErrors[0];
                            }
                          }
                          // console.log("------formErrors------", errorMessage, formErrors);
                        }
                        // Handle react-hook-form errors
                        else {
                          const rhfErrors = errors as Record<string, any>;
                          const errorMessages = Object.entries(rhfErrors)
                            .filter(([_, error]) => error !== undefined)
                            .map(([fieldName, error]) => {
                              if (error && typeof error === 'object' && 'message' in error && error.message) {
                                return error.message;
                              } else if (error && typeof error === 'string') {
                                return error;
                              }
                              return t($ => $.dialog.formValidationErrorGeneric);
                            });

                          if (errorMessages.length > 0) {
                            errorMessage = errorMessages[0];
                          }
                        }
                        // console.log("----------", errorMessage);

                        // Set error message to display in the dialog
                        setErrorMessage(errorMessage);
                        return;
                      } else {
                        // Fallback error message
                        setErrorMessage(t($ => $.dialog.formValidationError));
                        return;
                      }
                    }

                    // Form is valid, proceed with submission
                    modal?.onConfirmClick(form.getValues());
                  } catch (error) {
                    setErrorMessage(t($ => $.dialog.formValidationErrorUnknown));
                  }
                }}>
                  {modal?.textConfirm ?? t($ => $.shared.save)}
                </Button>
                {modal.onCancelClick && (
                  <Button
                    variant="outline"
                    className="min-w-[80px]"
                    type="button"
                    onClick={() => {
                      modal.onCancelClick?.();
                      setIsOpen(false);
                      setErrorMessage(null); // Clear error message on cancel
                    }}
                  >
                    {modal?.textCancel ?? t($ => $.shared.cancel)}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}