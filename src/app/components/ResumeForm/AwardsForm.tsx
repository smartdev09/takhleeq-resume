import { Form, FormSection } from "components/ResumeForm/Form";
import { Input, Textarea } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeAwards, selectAwards } from "lib/redux/resumeSlice";
import type { ResumeAward } from "lib/redux/types";

export const AwardsForm = () => {
  const awards = useAppSelector(selectAwards);
  const dispatch = useAppDispatch();
  const showDelete = awards.length > 1;

  return (
    <Form form="awards" addButtonText="Add Award">
      {awards.map(({ title, description, date }, idx) => {
        const handleChange = (field: keyof ResumeAward, value: string) => {
          dispatch(changeAwards({ idx, field, value }));
        };
        const showMoveUp = idx !== 0;
        const showMoveDown = idx !== awards.length - 1;

        return (
          <FormSection
            key={idx}
            form="awards"
            idx={idx}
            showMoveUp={showMoveUp}
            showMoveDown={showMoveDown}
            showDelete={showDelete}
            deleteButtonTooltipText="Delete award"
          >
            <Input
              label="Title"
              labelClassName="col-span-4"
              name="title"
              placeholder="Dean's List"
              value={title}
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
            <Textarea
              label="Description"
              labelClassName="col-span-full"
              name="description"
              placeholder="Awarded to top 10% of students..."
              value={description}
              onChange={handleChange}
            />
          </FormSection>
        );
      })}
    </Form>
  );
};
