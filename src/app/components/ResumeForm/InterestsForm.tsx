import { Form } from "components/ResumeForm/Form";
import { Textarea } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeInterests, selectInterests } from "lib/redux/resumeSlice";

export const InterestsForm = () => {
  const interests = useAppSelector(selectInterests);
  const dispatch = useAppDispatch();
  const value = interests.commaSeparated ?? "";

  const handleChange = (v: string) => {
    dispatch(changeInterests({ field: "commaSeparated", value: v }));
  };

  return (
    <Form form="interests">
      <div className="grid grid-cols-6 gap-3">
        <Textarea
          label="Interests (comma-separated)"
          labelClassName="col-span-full"
          name="commaSeparated"
          placeholder="Hiking, Open source, Reading"
          value={value}
          onChange={(_name, v) => handleChange(v)}
        />
      </div>
    </Form>
  );
};
