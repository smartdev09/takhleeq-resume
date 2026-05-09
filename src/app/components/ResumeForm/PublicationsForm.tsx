import { Form, FormSection } from "components/ResumeForm/Form";
import { Input } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changePublications, selectPublications } from "lib/redux/resumeSlice";
import type { ResumePublication } from "lib/redux/types";

export const PublicationsForm = () => {
  const publications = useAppSelector(selectPublications);
  const dispatch = useAppDispatch();
  const showDelete = publications.length > 1;

  return (
    <Form form="publications" addButtonText="Add Publication">
      {publications.map(({ title, authors, venue, date, link }, idx) => {
        const handleChange = (field: keyof ResumePublication, value: string) => {
          dispatch(changePublications({ idx, field, value }));
        };
        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== publications.length - 1;

        return (
          <FormSection
            key={idx}
            form="publications"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText="Delete publication"
          >
            <Input
              label="Title"
              labelClassName="col-span-full"
              name="title"
              placeholder="Paper title"
              value={title}
              onChange={handleChange}
            />
            <Input
              label="Authors"
              labelClassName="col-span-4"
              name="authors"
              placeholder="J. Doe, J. Smith"
              value={authors}
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
              label="Venue"
              labelClassName="col-span-full"
              name="venue"
              placeholder="Conference or Journal name"
              value={venue}
              onChange={handleChange}
            />
            <Input
              label="Link (optional)"
              labelClassName="col-span-full"
              name="link"
              placeholder="https://..."
              value={link ?? ""}
              onChange={handleChange}
            />
          </FormSection>
        );
      })}
    </Form>
  );
};
