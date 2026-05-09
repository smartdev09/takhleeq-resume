import { Form, FormSection } from "components/ResumeForm/Form";
import { Input } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeCertifications, selectCertifications } from "lib/redux/resumeSlice";
import type { ResumeCertification } from "lib/redux/types";

export const CertificationsForm = () => {
  const certifications = useAppSelector(selectCertifications);
  const dispatch = useAppDispatch();
  const showDelete = certifications.length > 1;

  return (
    <Form form="certifications" addButtonText="Add Certification">
      {certifications.map(({ name, issuer, date, url }, idx) => {
        const handleChange = (field: keyof ResumeCertification, value: string) => {
          dispatch(changeCertifications({ idx, field, value }));
        };
        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== certifications.length - 1;

        return (
          <FormSection
            key={idx}
            form="certifications"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText="Delete certification"
          >
            <Input
              label="Certification name"
              labelClassName="col-span-4"
              name="name"
              placeholder="AWS Certified Developer"
              value={name}
              onChange={handleChange}
            />
            <Input
              label="Date"
              labelClassName="col-span-2"
              name="date"
              placeholder="2023"
              value={date}
              onChange={handleChange}
            />
            <Input
              label="Issuer"
              labelClassName="col-span-full"
              name="issuer"
              placeholder="Amazon Web Services"
              value={issuer}
              onChange={handleChange}
            />
            <Input
              label="URL (optional)"
              labelClassName="col-span-full"
              name="url"
              placeholder="https://..."
              value={url ?? ""}
              onChange={handleChange}
            />
          </FormSection>
        );
      })}
    </Form>
  );
};
