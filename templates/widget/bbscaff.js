console.log('This widget is not compatible with CXP 5.6');

module.exports = function(bbscaff){
    bbscaff.prompt([
        {
            type: 'input',
            name: 'widget_name',
            message: 'Name'
        }, {
            type: 'input',
            name: 'widget_description',
            message: 'Description'
        }, {
            type: 'input',
            name: 'widget_version',
            message: 'Version',
            default: '1.0.0'
        }, {
            type: 'input',
            name: 'widget_author',
            message: 'Author'
        }
    ], function(answers){
        bbscaff.generate(answers, answers.widget_name);
    });
};