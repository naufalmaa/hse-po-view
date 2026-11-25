
type Props = {
  formKey: string,
  data: any,
  supportingFiles: any
}
export const  createFormData = ({formKey, data, supportingFiles}: Props) => {
  let files = [];
  let filesKeys = [];
  for (let i = 0; i < supportingFiles?.files?.length; i++) {
    const file = supportingFiles?.files[i];
    files.push({
      key: `${formKey}_file_${i + 1}`,
      file: file?.file
    });
    filesKeys.push({
      file: `${formKey}_file_${i + 1}`,
      note: file?.notes ?? ""
    })
  }

  return {
    key: formKey,
    data: {...data, files: filesKeys},
    files: files
  }
}