import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useAppTranslation, AppTranslation } from '@/lib/i18n-typed'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { ImageCropper } from '@/components/custom/components'
import { FileWithPath, useDropzone } from 'react-dropzone'
import { FileWithPreview } from '@/components/custom/components/image-cropper'
import { useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react'

// Define the form values type
export type SignatureFormValues = {
    signature: string | null,
}

const accept = {
    "image/*": [],
}

// Define a function to create form data with translations
const createSignatureFormData = (t: AppTranslation) => {
    return {
        schema: z.object({
            signature: z.string().nullable().optional(),
        }),
        defaultValue: {
            signature: null,
        } satisfies SignatureFormValues
    }
}

interface SignatureFormProps {
    form: any
    onSubmit: (values: any, signatureFile: File | null) => void
    error?: string | null
}

// Add ref interface
export interface SignatureFormRef {
    resetSignatureState: () => void
}

export const SignatureForm = forwardRef<SignatureFormRef, SignatureFormProps>(({ form, onSubmit, error }, ref) => {
    const { t } = useAppTranslation()

    // Handle form submission
    const handleSubmit = (values: Record<string, any>) => {
        onSubmit(values, croppedSignatureFile);
    }

    // Expose function to reset signature state
    const resetSignatureState = () => {
        setSelectedFile(null);
        setDialogOpen(false);
        setHasSignatureChanged(false);
        setCroppedSignatureFile(null);
    }

    // Reset signature changed flag when form is reset
    useEffect(() => {
        if (!form.formState.isDirty) {
            setHasSignatureChanged(false);
            setCroppedSignatureFile(null);
        }
    }, [form.formState.isDirty]);

    // Expose reset function through ref
    useImperativeHandle(ref, () => ({
        resetSignatureState
    }));

    const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [hasSignatureChanged, setHasSignatureChanged] = useState(false);
    const [croppedSignatureFile, setCroppedSignatureFile] = useState<File | null>(null);

    const onDrop = useCallback(
        (acceptedFiles: FileWithPath[]) => {
            const file = acceptedFiles[0]
            if (!file) {
                alert("Selected image is too large!")
                return
            }

            const fileWithPreview = Object.assign(file, {
                preview: URL.createObjectURL(file),
            })

            setSelectedFile(fileWithPreview)
            setDialogOpen(true)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept,
    })

    // Determine if form has changes (either form fields are dirty or a signature has been changed)
    const hasChanges = form.formState.isDirty || hasSignatureChanged;

    return (
        <Card className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-none w-full pb-0 mt-6">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 [.border-b]:pb-4">
                <CardTitle className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">
                    {t($ => $.user.profile.signature.title)}
                </CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <CardContent className="px-6 pb-6 space-y-6 w-full">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                            <div className="">
                                {selectedFile ? (
                                    <ImageCropper
                                        dialogOpen={isDialogOpen}
                                        setDialogOpen={(open) => {
                                            setDialogOpen(open);
                                            // When dialog closes and we have a cropped image, mark as changed
                                            if (!open && selectedFile) {
                                                setHasSignatureChanged(true);
                                            }
                                        }}
                                        selectedFile={selectedFile}
                                        setSelectedFile={setSelectedFile}
                                        title={t($ => $.user.profile.signature.changeSignature)}
                                        onCropComplete={(file: File) => setCroppedSignatureFile(file)}
                                        // Enable free cropping for signatures
                                        freeCrop={true}
                                    />
                                ) : (
                                    <div 
                                        {...getRootProps()} 
                                        className="h-36 w-auto cursor-pointer ring-offset-2 ring-2 ring-slate-200 overflow-hidden"
                                    >
                                        <input {...getInputProps()} />
                                        {form?.getValues?.("signature") ? (
                                            <div className="h-full w-auto flex flex-col">
                                                <img
                                                    src={form?.getValues?.("signature") || ""}
                                                    alt="Current signature"
                                                    className="h-auto object-contain flex-grow"
                                                />
                                                <div className="p-2 text-center bg-gray-100 dark:bg-gray-700/50">
                                                    <p className="text-xs text-gray-600 dark:text-gray-300">{t($ => $.user.profile.signature.dragDrop)}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">
                                                    {t($ => $.user.profile.signature.dragDrop)}
                                                </p>
                                                <Button type="button" variant="outline" size="sm">
                                                    {t($ => $.user.profile.signature.selectFile)}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    {hasChanges && (<CardFooter className="p-6 flex justify-end items-center gap-4 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset();
                                setHasSignatureChanged(false);
                                setSelectedFile(null);
                                setCroppedSignatureFile(null);
                            }}
                        >
                            {t($ => $.labels.cancel)}
                        </Button>
                        <Button
                            type="submit"
                            variant="default"
                        >
                            {t($ => $.labels.save)}
                        </Button>
                    </CardFooter>)}
                </form>
            </Form>
        </Card>
    )
})

export { createSignatureFormData }