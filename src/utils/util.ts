import moment from 'moment';

export const formatDateByFormat = ({
  date,
  format,
}: {
  date: string | Date;
  format?: string;
}) => moment(date).format(format || 'YYYY-MM-DD hh:mm');
